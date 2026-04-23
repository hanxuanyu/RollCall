package database

import "database/sql"

func migrate(db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS classes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			is_default INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
		)`,
		`CREATE TABLE IF NOT EXISTS students (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			gender TEXT NOT NULL DEFAULT '',
			score INTEGER NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'active',
			created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
		)`,
		`CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id)`,
		`CREATE TABLE IF NOT EXISTS score_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			delta INTEGER NOT NULL,
			reason TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
		)`,
		`CREATE INDEX IF NOT EXISTS idx_score_logs_student ON score_logs(student_id)`,
		`CREATE TABLE IF NOT EXISTS rollcall_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
			mode TEXT NOT NULL,
			count INTEGER NOT NULL,
			result TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
		)`,
		`CREATE INDEX IF NOT EXISTS idx_rollcall_logs_class ON rollcall_logs(class_id)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return err
		}
	}
	return nil
}
