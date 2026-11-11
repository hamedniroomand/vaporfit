# Makes the demo again from the repository root: vp run build && vhs docs/demo.tape
Output docs/public/demo.gif

Set Shell bash
Set FontFamily "Geist Mono, JetBrains Mono, Menlo, monospace"
Set FontSize 15
Set LineHeight 1.3
Set Width 1400
Set Height 860
Set Padding 28
Set Margin 24
Set MarginFill "#0b0d24"
Set BorderRadius 12
Set Theme { "name": "vaporfit", "background": "#131636", "foreground": "#eeedf7", "cursor": "#f5a623", "selection": "#262a55", "black": "#131636", "red": "#ff6166", "green": "#62c073", "yellow": "#f2a20d", "blue": "#8f9bff", "magenta": "#c58fd6", "cyan": "#7fd3e0", "white": "#eeedf7", "brightBlack": "#a9abc9", "brightRed": "#ff6166", "brightGreen": "#62c073", "brightYellow": "#f2a20d", "brightBlue": "#8f9bff", "brightMagenta": "#c58fd6", "brightCyan": "#7fd3e0", "brightWhite": "#ffffff" }
Set TypingSpeed 45ms
Set CursorBlink false
Set WaitTimeout 60s
Set WaitPattern /❯$/

Hide
Type "source docs/demo-setup.sh"
Enter
Wait
Show

# 1. The check: a finding shows the file, the line, the rule and the chain of components.
Sleep 600ms
Type "npx vaporfit"
Sleep 300ms
Enter
Wait
Sleep 7s

# 2. The fix command prints the changes for the ready components.
Hide
Type "clear"
Enter
Wait
Show
Type "npx vaporfit fix"
Sleep 300ms
Enter
Wait
Sleep 5s
