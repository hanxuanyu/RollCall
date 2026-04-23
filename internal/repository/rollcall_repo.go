package repository

import (
	"database/sql"
	"encoding/json"

	"RollCall/internal/model"
)

type RollCallRepo struct {
	db *sql.DB
}

func NewRollCallRepo(db *sql.DB) *RollCallRepo {
	return &RollCallRepo{db: db}
}

func (r *RollCallRepo) Create(log *model.RollCallLog) error {
	_, err := r.db.Exec(
		"INSERT INTO rollcall_logs (class_id, mode, count, result) VALUES (?, ?, ?, ?)",
		log.ClassID, log.Mode, log.Count, log.Result,
	)
	return err
}

func (r *RollCallRepo) ListByClassID(classID int64, limit int) ([]model.RollCallLog, error) {
	rows, err := r.db.Query(
		"SELECT id, class_id, mode, count, result, created_at FROM rollcall_logs WHERE class_id = ? ORDER BY created_at DESC LIMIT ?",
		classID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []model.RollCallLog
	for rows.Next() {
		var l model.RollCallLog
		rows.Scan(&l.ID, &l.ClassID, &l.Mode, &l.Count, &l.Result, &l.CreatedAt)
		list = append(list, l)
	}
	return list, nil
}

func (r *RollCallRepo) DeleteByClassID(classID int64) error {
	_, err := r.db.Exec("DELETE FROM rollcall_logs WHERE class_id = ?", classID)
	return err
}

func (r *RollCallRepo) GetRecentPickedStudentIDs(classID int64, windowSize int) ([]int64, error) {
	rows, err := r.db.Query(
		"SELECT result FROM rollcall_logs WHERE class_id = ? ORDER BY created_at DESC LIMIT ?",
		classID, windowSize,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var allIDs []int64
	for rows.Next() {
		var resultJSON string
		rows.Scan(&resultJSON)
		var ids []int64
		json.Unmarshal([]byte(resultJSON), &ids)
		allIDs = append(allIDs, ids...)
	}
	return allIDs, nil
}
