#!/usr/bin/env python3
"""Drive Safari: open each contact page in the Elementor editor, run wp-address-apply.js, report the result."""
import subprocess, time, json, sys, os
IDS = [int(x) for x in sys.argv[1:]] or [1933, 4886, 5067, 5290, 5500, 5791, 6664]
JS = open(os.path.join(os.path.dirname(__file__), 'wp-address-apply.js'), encoding='utf-8').read()
def osa(script): return subprocess.run(['osascript', '-e', script], capture_output=True, text=True).stdout.strip()
def q(s): return s.replace('\\', '\\\\').replace('"', '\\"')
osa('tell application "Safari" to tell front window to set current tab to (make new tab with properties {URL:"about:blank"})')
for pid in IDS:
    osa(f'tell application "Safari" to set URL of current tab of front window to "https://www.schmoll-asia.com/wp-admin/post.php?post={pid}&action=elementor"')
    # wait for the editor
    ready = False
    for i in range(40):
        time.sleep(3)
        r = osa('tell application "Safari" to do JavaScript "(window.elementor && window.$e && elementor.documents && elementor.documents.getCurrent()) ? \'ready\' : \'no\'" in current tab of front window')
        if r == 'ready': ready = True; break
    if not ready: print(pid, 'editor not ready'); continue
    time.sleep(4)
    osa(f'tell application "Safari" to do JavaScript "{q(JS)}" in current tab of front window')
    res = None
    for i in range(40):
        time.sleep(3)
        t = osa('tell application "Safari" to do JavaScript "document.title" in current tab of front window')
        if t.startswith('ADDR:'): res = t[5:]; break
    print(pid, res or 'no result (timeout)')
