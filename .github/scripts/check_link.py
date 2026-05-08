import json
import os
import re
import sys
import time
import requests


def extract_json_from_body(body):
    """从 issue body 中提取 JSON 数据"""
    if not body:
        return None, "Issue 内容为空"
    
    # 尝试匹配 ```json ... ``` 代码块
    json_pattern = r'```json\s*\n(.*?)\n```'
    match = re.search(json_pattern, body, re.DOTALL)
    
    if match:
        return match.group(1).strip(), None
    
    # 如果没有 json 标记，尝试匹配 ``` ... ```
    code_pattern = r'```\s*\n(.*?)\n```'
    match = re.search(code_pattern, body, re.DOTALL)
    
    if match:
        return match.group(1).strip(), None
    
    # 如果没有代码块，尝试直接匹配 JSON 对象
    json_obj_pattern = r'\{[\s\S]*?"title"[\s\S]*?"url"[\s\S]*?\}'
    match = re.search(json_obj_pattern, body)
    
    if match:
        return match.group(0).strip(), None
    
    return None, "无法从 Issue 中提取 JSON 数据"


def validate_json(json_str):
    """验证 JSON 格式是否正确"""
    try:
        data = json.loads(json_str)
        
        # 检查必需的字段
        required_fields = ['title', 'url']
        for field in required_fields:
            if field not in data:
                return None, f"JSON 缺少必需字段: {field}"
        
        # 检查 url 字段是否为空
        if not data.get('url'):
            return None, "url 字段不能为空"
        
        return data, None
    except json.JSONDecodeError as e:
        return None, f"JSON 格式错误: {str(e)}"


def check_url_accessibility(url, max_retries=3):
    """检查 URL 是否可访问，最多重试 3 次"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    last_error = None
    
    for attempt in range(1, max_retries + 1):
        try:
            response = requests.get(
                url,
                headers=headers,
                timeout=30,
                allow_redirects=True
            )
            
            # 2xx 和 3xx 状态码都认为是成功的
            if response.status_code < 400:
                return True, None
            else:
                last_error = f"HTTP {response.status_code}"
                
        except requests.exceptions.Timeout:
            last_error = "连接超时"
        except requests.exceptions.ConnectionError:
            last_error = "连接错误"
        except requests.exceptions.RequestException as e:
            last_error = f"请求异常: {str(e)}"
        except Exception as e:
            last_error = f"未知错误: {str(e)}"
        
        if attempt < max_retries:
            time.sleep(2)  # 重试前等待 2 秒
    
    return False, f"经过 {max_retries} 次尝试后仍然无法访问，最后错误: {last_error}"


def set_output(name, value):
    """设置 GitHub Actions 输出"""
    github_output = os.environ.get('GITHUB_OUTPUT')
    if github_output:
        with open(github_output, 'a') as f:
            f.write(f"{name}={value}\n")
    else:
        print(f"::set-output name={name}::{value}")


def main():
    issue_body = os.environ.get('ISSUE_BODY', '')
    issue_number = os.environ.get('ISSUE_NUMBER', '')
    
    print(f"正在检查 Issue #{issue_number}...")
    print(f"Issue 内容长度: {len(issue_body)} 字符")
    
    # 1. 提取 JSON
    json_str, error = extract_json_from_body(issue_body)
    if error:
        print(f"❌ {error}")
        set_output("result", "failure")
        set_output("reason", error)
        sys.exit(0)
    
    print("✅ 成功提取 JSON 数据")
    print(f"JSON 内容:\n{json_str}")
    
    # 2. 验证 JSON 格式
    data, error = validate_json(json_str)
    if error:
        print(f"❌ {error}")
        set_output("result", "failure")
        set_output("reason", error)
        sys.exit(0)
    
    print("✅ JSON 格式验证通过")
    print(f"站点名称: {data.get('title')}")
    print(f"站点 URL: {data.get('url')}")
    
    # 3. 检查 URL 可访问性
    url = data.get('url')
    print(f"\n正在检查 URL 可访问性: {url}")
    
    is_accessible, error = check_url_accessibility(url)
    
    if is_accessible:
        print("✅ URL 可访问性检查通过")
        set_output("result", "success")
        set_output("reason", "")
    else:
        print(f"❌ {error}")
        set_output("result", "failure")
        set_output("reason", error)
    
    sys.exit(0)


if __name__ == '__main__':
    main()
