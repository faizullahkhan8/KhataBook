# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# assets
- Use app-logo-without-bg.png instead of app-logo.png for all logo usage. Confidence: 0.70

# react-native
- Use Pressable instead of TouchableWithoutFeedback (deprecated). Confidence: 0.70
- Use style.pointerEvents instead of props.pointerEvents (deprecated). Confidence: 0.70

# performance
- Use database-level pagination instead of loading all records into memory for paginated displays. Confidence: 0.80

# react-native
- Use width: "100%" + maxWidth instead of percentage widths (e.g., width: "85%") on nested absolutely-positioned views to avoid circular dependency. Confidence: 0.70

# ui
- Show loading component until ALL data sources are loaded — include every relevant loading state in the loading gate condition, not just one. Confidence: 0.70

# expo
- Use expo-audio instead of expo-av for audio recording/playback (expo-av Audio is deprecated). Confidence: 0.65

# react-native
- Extract significant, self-contained UI blocks (like calculator keyboards) into reusable components rather than keeping them inline in screen files. Confidence: 0.70

# navigation
- Derive transaction type from the source navigation (FAB/button that triggered navigation) rather than duplicating a type toggle on the target screen. Confidence: 0.65

