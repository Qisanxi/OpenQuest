# Keep the NanoHTTPD classes — they use reflection
-keep class org.nanohttpd.** { *; }
-keep class fi.iki.elonen.** { *; }

# Keep the lockout service entry points
-keep class com.openquest.companion.LockoutService { *; }
-keep class com.openquest.companion.LockoutVpnService { *; }
-keep class com.openquest.companion.LocalhostServer { *; }
-keep class com.openquest.companion.PanicPinManager { *; }
-keep class com.openquest.companion.Policy { *; }

# Kotlin metadata
-dontwarn kotlinx.coroutines.**
-keepclassmembers class kotlinx.coroutines.** { *; }
