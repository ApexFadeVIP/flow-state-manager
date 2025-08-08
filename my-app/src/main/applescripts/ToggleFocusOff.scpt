set shortcutName to "Turn off work focus"
try
    tell application "Shortcuts Events"
        run shortcut shortcutName
    end tell
on error
    -- If shortcut doesn't exist, open the iCloud link to import it
    do shell script "open 'https://www.icloud.com/shortcuts/596cf3482ce84a34a4c306c0d6bc47be'"
    delay 20 -- wait for user to confirm import
    tell application "Shortcuts Events"
        run shortcut shortcutName
    end tell
end try
