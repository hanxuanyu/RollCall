package repository

import (
	"database/sql"
	"strings"

	"RollCall/internal/model"
)

type StudentRepo struct {
	db *sql.DB
}

func NewStudentRepo(db *sql.DB) *StudentRepo {
	return &StudentRepo{db: db}
}

func (r *StudentRepo) Create(s *model.Student) (*model.Student, error) {
	res, err := r.db.Exec(
		"INSERT INTO students (class_id, name, student_no, gender, score, status) VALUES (?, ?, ?, ?, ?, ?)",
		s.ClassID, s.Name, s.StudentNo, s.Gender, s.Score, "active",
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return r.GetByID(id)
}

func (r *StudentRepo) GetByID(id int64) (*model.Student, error) {
	s := &model.Student{}
	err := r.db.QueryRow(
		"SELECT id, class_id, name, student_no, gender, score, status, created_at FROM students WHERE id = ?", id,
	).Scan(&s.ID, &s.ClassID, &s.Name, &s.StudentNo, &s.Gender, &s.Score, &s.Status, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *StudentRepo) ListByClassID(classID int64) ([]model.Student, error) {
	rows, err := r.db.Query(
		"SELECT id, class_id, name, student_no, gender, score, status, created_at FROM students WHERE class_id = ? ORDER BY id", classID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanStudents(rows)
}

func (r *StudentRepo) ListActiveByClassID(classID int64) ([]model.Student, error) {
	rows, err := r.db.Query(
		"SELECT id, class_id, name, student_no, gender, score, status, created_at FROM students WHERE class_id = ? AND status = 'active' ORDER BY id", classID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanStudents(rows)
}

func (r *StudentRepo) Update(s *model.Student) error {
	_, err := r.db.Exec(
		"UPDATE students SET name = ?, student_no = ?, gender = ?, score = ?, status = ? WHERE id = ?",
		s.Name, s.StudentNo, s.Gender, s.Score, s.Status, s.ID,
	)
	return err
}

func (r *StudentRepo) Delete(id int64) error {
	_, err := r.db.Exec("DELETE FROM students WHERE id = ?", id)
	return err
}

func (r *StudentRepo) BatchCreate(students []model.Student) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	stmt, err := tx.Prepare("INSERT INTO students (class_id, name, student_no, gender, score, status) VALUES (?, ?, ?, ?, ?, 'active')")
	if err != nil {
		tx.Rollback()
		return err
	}
	defer stmt.Close()
	for _, s := range students {
		if _, err := stmt.Exec(s.ClassID, s.Name, s.StudentNo, s.Gender, s.Score); err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

func (r *StudentRepo) UpdateScore(id int64, delta int) error {
	_, err := r.db.Exec("UPDATE students SET score = score + ? WHERE id = ?", delta, id)
	return err
}

func (r *StudentRepo) BatchUpdateScore(ids []int64, delta int) error {
	if len(ids) == 0 {
		return nil
	}
	placeholders := strings.Repeat("?,", len(ids))
	placeholders = placeholders[:len(placeholders)-1]
	args := make([]interface{}, 0, len(ids)+1)
	args = append(args, delta)
	for _, id := range ids {
		args = append(args, id)
	}
	_, err := r.db.Exec("UPDATE students SET score = score + ? WHERE id IN ("+placeholders+")", args...)
	return err
}

func (r *StudentRepo) Search(classID int64, query string) ([]model.Student, error) {
	rows, err := r.db.Query(
		"SELECT id, class_id, name, student_no, gender, score, status, created_at FROM students WHERE class_id = ? AND (name LIKE ? OR student_no LIKE ?) ORDER BY id",
		classID, "%"+query+"%", "%"+query+"%",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanStudents(rows)
}

func (r *StudentRepo) CountByClassID(classID int64) (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM students WHERE class_id = ?", classID).Scan(&count)
	return count, err
}

func scanStudents(rows *sql.Rows) ([]model.Student, error) {
	var list []model.Student
	for rows.Next() {
		var s model.Student
		rows.Scan(&s.ID, &s.ClassID, &s.Name, &s.StudentNo, &s.Gender, &s.Score, &s.Status, &s.CreatedAt)
		list = append(list, s)
	}
	return list, nil
}
