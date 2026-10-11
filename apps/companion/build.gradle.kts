// Top-level build file
plugins {
    id("com.android.application") version "8.7.0" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    // Kotlin 2.0+ ships the Compose compiler as a Gradle plugin (versioned with Kotlin).
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}
