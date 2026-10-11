package com.openquest.companion

/**
 * In-memory lockout state, polled by the localhost server's /status endpoint.
 *
 * Kept simple — just a global object. The LockoutService updates it when
 * it starts/stops a lockout, and the LocalhostServer reads it on every
 * /status request.
 *
 * For persistence across reboots, we also write the active state to
 * SharedPreferences so BootReceiver can restore it. (TODO: implement
 * BootReceiver persistence — for the MVP we just lose state on reboot,
 * which actually means the phone unlocks on reboot, which is safe.)
 */
object LockoutState {

    @Volatile
    private var current: State = State.Inactive

    fun setActive(questId: String, expiresAt: Long) {
        current = State.Active(
            questId = questId,
            lockedAt = System.currentTimeMillis(),
            expiresAt = expiresAt,
        )
    }

    fun setInactive() {
        current = State.Inactive
    }

    fun current(): State = current

    sealed class State {
        object Inactive : State() {
            val state = LockoutStatus.UNLOCKED
        }
        data class Active(
            val questId: String,
            val lockedAt: Long,
            val expiresAt: Long,
        ) : State() {
            val state = LockoutStatus.LOCKED
        }
    }

    data class Snapshot(
        val state: LockoutStatus,
        val lockedAt: Long?,
        val expiresAt: Long?,
        val questId: String?,
    )

    fun snapshot(): Snapshot = when (val s = current) {
        is State.Inactive -> Snapshot(LockoutStatus.UNLOCKED, null, null, null)
        is State.Active -> Snapshot(LockoutStatus.LOCKED, s.lockedAt, s.expiresAt, s.questId)
    }
}

enum class LockoutStatus {
    UNLOCKED,
    LOCKED,
    LOCKING,
    UNLOCKING,
    PANIC,
}
