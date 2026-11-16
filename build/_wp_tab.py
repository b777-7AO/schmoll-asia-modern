#!/usr/bin/env python3
"""Safari helper bound to ONE tab (found by URL fragment, created if missing). usage as module."""
import subprocess, time, json
def osa(s): return subprocess.run(['osascript','-e',s],capture_output=True,text=True).stdout.strip()
def q(s): return s.replace('\\','\\\\').replace('"','\\"')
FIND='''on findTab(frag)
  tell application "Safari"
    repeat with w in windows
      repeat with t in tabs of w
        if URL of t contains frag then return t
      end repeat
    end repeat
    tell front window to set t to make new tab with properties {URL:"https://www.schmoll-asia.com/wp-admin/"}
    return t
  end tell
end findTab
'''
def load(url, wait=10):
    osa(FIND+f'set t to findTab("schmoll-asia.com/wp-")\ntell application "Safari" to set URL of t to "{url}"'); time.sleep(wait)
def js(code):
    return osa(FIND+f'set t to findTab("schmoll-asia.com/wp-")\ntell application "Safari" to do JavaScript "{q(code)}" in t')
def wait_title(prefix, tries=60, every=3):
    for i in range(tries):
        time.sleep(every); t=js('document.title')
        if t.startswith(prefix): return t[len(prefix):]
    return None
if __name__=='__main__':
    import sys
    load('https://www.schmoll-asia.com/wp-admin/index.php', 10)
    print('page:', js('document.title + " | " + (window.wpApiSettings ? "nonce ok" : "no nonce")'))
