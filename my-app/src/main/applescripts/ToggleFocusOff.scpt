set shortcutName to "Turn off work focus"
try
    tell application "Shortcuts Events"
        run shortcut shortcutName
    end tell
on error
    -- If shortcut doesn't exist, open the iCloud link to import it
    do shell script "open 'https://www.icloud.com/shortcuts/89aa272bdccb4b719f85ddaed48515b5'"
    delay 20 -- wait for user to confirm import
    tell application "Shortcuts Events"
        run shortcut shortcutName
    end tell
end try
