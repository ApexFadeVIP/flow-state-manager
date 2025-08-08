set shortcutName to "Turn on work focus"
try
    tell application "Shortcuts Events"
        run shortcut shortcutName
    end tell
on error
    -- If shortcut doesn't exist, open the iCloud link to import it
    do shell script "open 'https://www.icloud.com/shortcuts/0347e7f7972a49b58d6b3bb8036fe18d'"
    delay 20 -- wait for user to confirm import
    tell application "Shortcuts Events"
        run shortcut shortcutName
    end tell
end try
