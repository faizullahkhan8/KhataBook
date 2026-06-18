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

