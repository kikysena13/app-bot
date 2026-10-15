create database DISCORD;
use DISCORD;
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  discord_user_id VARCHAR(32) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL,
  avatar VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS guilds (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(255) NULL,
  bot_status ENUM('online','offline','unknown') NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS guild_members (
  guild_id VARCHAR(32) NOT NULL,
  discord_user_id VARCHAR(32) NOT NULL,
  username VARCHAR(100) NULL,
  display_name VARCHAR(100) NOT NULL,
  joined_at DATETIME NULL,
  avatar_url VARCHAR(255) NULL,
  banner_url VARCHAR(255) NULL,
  avatar_decoration VARCHAR(255) NULL,
  accent_color VARCHAR(20) NULL,
  roles_json TEXT NULL,
  left_at DATETIME NULL,
  is_present BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (guild_id, discord_user_id),
  INDEX idx_members_present (guild_id, is_present)
);
CREATE TABLE IF NOT EXISTS activity_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(32) NOT NULL,
  discord_user_id VARCHAR(32) NOT NULL,
  event_type ENUM('message','member_join','member_leave','voice_join','voice_leave') NOT NULL,
  channel_id VARCHAR(32) NULL,
  occurred_at DATETIME NOT NULL,
  idempotency_key VARCHAR(150) NOT NULL UNIQUE,
  INDEX idx_activity_guild_time (guild_id, occurred_at)
);
CREATE TABLE IF NOT EXISTS daily_activity_stats (
  guild_id VARCHAR(32) NOT NULL,
  discord_user_id VARCHAR(32) NOT NULL,
  activity_date DATE NOT NULL,
  message_count INT UNSIGNED NOT NULL DEFAULT 0,
  voice_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, discord_user_id, activity_date)
);
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id VARCHAR(32) PRIMARY KEY,
  track_messages BOOLEAN NOT NULL DEFAULT TRUE,
  track_voice BOOLEAN NOT NULL DEFAULT TRUE,
  retention_days INT UNSIGNED NOT NULL DEFAULT 90,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id VARCHAR(32) NOT NULL,
  guild_id VARCHAR(32) NOT NULL,
  action VARCHAR(100) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_guild_time (guild_id, created_at)
);
CREATE TABLE IF NOT EXISTS forbidden_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(32) NOT NULL,
  discord_user_id VARCHAR(32) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  username VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(255) NOT NULL,
  forbidden_word VARCHAR(50) NOT NULL,
  channel_id VARCHAR(32) NOT NULL,
  message_id VARCHAR(32) NOT NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_forbidden_guild_time (guild_id, occurred_at),
  INDEX idx_forbidden_guild_user (guild_id, discord_user_id)
);
