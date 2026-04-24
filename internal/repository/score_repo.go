package repository

import (
	"database/sql"

	"RollCall/internal/model"
)

type ScoreRepo struct {
	db *sql.DB
}

func NewScoreRepo(db *sql.DB) *ScoreRepo {
	return &ScoreRepo{db: db}
}

func (r *ScoreRepo) Create(studentID int64, delta int, reason string) error {
	_, err := r.db.Exec(
		"INSERT INTO score_logs (student_id, delta, reason) VALUES (?, ?, ?)",
		studentID, delta, reason,
	)
	return err
}

func (r *ScoreRepo) GetByID(id int64) (*model.ScoreLog, error) {
	var l model.ScoreLog
	err := r.db.QueryRow(
		"SELECT id, student_id, delta, reason, created_at FROM score_logs WHERE id = ?", id,
	).Scan(&l.ID, &l.StudentID, &l.Delta, &l.Reason, &l.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *ScoreRepo) Delete(id int64) error {
	_, err := r.db.Exec("DELETE FROM score_logs WHERE id = ?", id)
	return err
}

func (r *ScoreRepo) ListByStudent(studentID int64) ([]model.ScoreLog, error) {
	rows, err := r.db.Query(
		"SELECT id, student_id, delta, reason, created_at FROM score_logs WHERE student_id = ? ORDER BY created_at DESC", studentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []model.ScoreLog
	for rows.Next() {
		var l model.ScoreLog
		rows.Scan(&l.ID, &l.StudentID, &l.Delta, &l.Reason, &l.CreatedAt)
		list = append(list, l)
	}
	return list, nil
}

func (r *ScoreRepo) ListByClass(classID int64) ([]model.ScoreLog, error) {
	rows, err := r.db.Query(
		`SELECT sl.id, sl.student_id, s.name, sl.delta, sl.reason, sl.created_at
		 FROM score_logs sl JOIN students s ON sl.student_id = s.id
		 WHERE s.class_id = ? ORDER BY sl.created_at DESC LIMIT 200`, classID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []model.ScoreLog
	for rows.Next() {
		var l model.ScoreLog
		rows.Scan(&l.ID, &l.StudentID, &l.StudentName, &l.Delta, &l.Reason, &l.CreatedAt)
		list = append(list, l)
	}
	return list, nil
}
