set shortcutName to "Turn on work focus"
try
    tell application "Shortcuts Events"
        run shortcut shortcutName
    end tell
on error
    -- If shortcut doesn't exist, open the iCloud link to import it
    do shell script "open 'https://www.icloud.com/shortcuts/60db027559784c158ec30c97d4dda7c2'"
    delay 20 -- wait for user to confirm import
    tell application "Shortcuts Events"
        run shortcut shortcutName
    end tell
end try
