import json
import os
import re
import sys
from datetime import datetime

import requests


def extract_json_from_body(body):
    """从 issue body 中提取 JSON 数据"""
    if not body:
        return None
    
    # 尝试匹配 ```json ... ``` 代码块
    json_pattern = r'```json\s*\n(.*?)\n```'
    match = re.search(json_pattern, body, re.DOTALL)
    
    if match:
        return match.group(1).strip()
    
    # 如果没有 json 标记，尝试匹配 ``` ... ```
    code_pattern = r'```\s*\n(.*?)\n```'
    match = re.search(code_pattern, body, re.DOTALL)
    
    if match:
        return match.group(1).strip()
    
    # 如果没有代码块，尝试直接匹配 JSON 对象
    json_obj_pattern = r'\{[\s\S]*?"title"[\s\S]*?"url"[\s\S]*?\}'
    match = re.search(json_obj_pattern, body)
    
    if match:
        return match.group(0).strip()
    
    return None


def parse_link_data(json_str):
    """解析 JSON 字符串为友链数据"""
    try:
        data = json.loads(json_str)
        
        # 验证必需字段
        if not data.get('title') or not data.get('url'):
            return None
        
        # 返回标准格式的友链数据
        return {
            'title': data.get('title', ''),
            'screenshot': data.get('screenshot', ''),
            'url': data.get('url', ''),
            'avatar': data.get('avatar', ''),
            'description': data.get('description', ''),
            'keywords': data.get('keywords', '')
        }
    except json.JSONDecodeError:
        return None


def get_existing_links():
    """读取现有的友链数据"""
    links_file = 'links.json'
    if os.path.exists(links_file):
        try:
            with open(links_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []


def save_links(links):
    """保存友链数据到文件"""
    links_file = 'links.json'
    with open(links_file, 'w', encoding='utf-8') as f:
        json.dump(links, f, ensure_ascii=False, indent=2)


def is_duplicate(new_link, existing_links):
    """检查是否是重复的友链（根据 URL 判断）"""
    new_url = new_link.get('url', '').rstrip('/')
    for link in existing_links:
        existing_url = link.get('url', '').rstrip('/')
        if new_url == existing_url:
            return True
    return False


def fetch_active_issues(owner, repo, token):
    """获取带有 active 标签的开放 issues"""
    url = f'https://api.github.com/repos/{owner}/{repo}/issues'
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    params = {
        'state': 'open',
        'labels': 'active',
        'per_page': 100
    }
    
    all_issues = []
    page = 1
    
    while True:
        params['page'] = page
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
            print(f"Error fetching issues: {response.status_code}")
            print(response.text)
            break
        
        issues = response.json()
        if not issues:
            break
        
        all_issues.extend(issues)
        page += 1
        
        # 安全限制，最多获取 10 页
        if page > 10:
            break
    
    return all_issues


def main():
    # 获取环境变量
    token = os.environ.get('GITHUB_TOKEN')
    owner = os.environ.get('REPO_OWNER')
    repo = os.environ.get('REPO_NAME')
    
    if not token or not owner or not repo:
        print("Error: Missing required environment variables")
        print(f"TOKEN: {'set' if token else 'not set'}")
        print(f"OWNER: {owner}")
        print(f"REPO: {repo}")
        sys.exit(1)
    
    print(f"Starting sync at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Repository: {owner}/{repo}")
    
    # 读取现有的友链数据
    existing_links = get_existing_links()
    print(f"Existing links: {len(existing_links)}")
    
    # 获取带有 active 标签的 issues
    issues = fetch_active_issues(owner, repo, token)
    print(f"Found {len(issues)} active issues")
    
    new_links_count = 0
    skipped_count = 0
    error_count = 0
    
    for issue in issues:
        issue_number = issue.get('number')
        issue_title = issue.get('title', 'Unknown')
        body = issue.get('body', '')
        
        print(f"\nProcessing Issue #{issue_number}: {issue_title}")
        
        # 提取 JSON 数据
        json_str = extract_json_from_body(body)
        if not json_str:
            print(f"  ⚠️  No JSON data found in issue body")
            error_count += 1
            continue
        
        # 解析友链数据
        link_data = parse_link_data(json_str)
        if not link_data:
            print(f"  ⚠️  Failed to parse JSON data")
            error_count += 1
            continue
        
        print(f"  Title: {link_data['title']}")
        print(f"  URL: {link_data['url']}")
        
        # 检查是否重复
        if is_duplicate(link_data, existing_links):
            print(f"  ⏭️  Duplicate link, skipping")
            skipped_count += 1
            continue
        
        # 添加到友链列表
        existing_links.append(link_data)
        new_links_count += 1
        print(f"  ✅ Added new link")
    
    # 保存结果
    print(f"\n{'='*50}")
    print(f"Sync Summary:")
    print(f"  Total active issues: {len(issues)}")
    print(f"  New links added: {new_links_count}")
    print(f"  Duplicates skipped: {skipped_count}")
    print(f"  Errors: {error_count}")
    print(f"  Total links: {len(existing_links)}")
    
    if new_links_count > 0:
        save_links(existing_links)
        print(f"\n✅ Saved {len(existing_links)} links to links.json")
    else:
        print(f"\nℹ️ No new data to save")
    
    print(f"\nFinished at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == '__main__':
    main()
