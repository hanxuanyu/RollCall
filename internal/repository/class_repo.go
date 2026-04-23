package repository

import (
	"database/sql"

	"RollCall/internal/model"
)

type ClassRepo struct {
	db *sql.DB
}

func NewClassRepo(db *sql.DB) *ClassRepo {
	return &ClassRepo{db: db}
}

func (r *ClassRepo) Create(name string) (*model.Class, error) {
	res, err := r.db.Exec("INSERT INTO classes (name) VALUES (?)", name)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return r.GetByID(id)
}

func (r *ClassRepo) GetByID(id int64) (*model.Class, error) {
	c := &model.Class{}
	var isDefault int
	err := r.db.QueryRow("SELECT id, name, is_default, created_at FROM classes WHERE id = ?", id).
		Scan(&c.ID, &c.Name, &isDefault, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	c.IsDefault = isDefault == 1
	return c, nil
}

func (r *ClassRepo) List() ([]model.Class, error) {
	rows, err := r.db.Query("SELECT id, name, is_default, created_at FROM classes ORDER BY created_at")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []model.Class
	for rows.Next() {
		var c model.Class
		var isDefault int
		rows.Scan(&c.ID, &c.Name, &isDefault, &c.CreatedAt)
		c.IsDefault = isDefault == 1
		list = append(list, c)
	}
	return list, nil
}

func (r *ClassRepo) Update(id int64, name string) error {
	_, err := r.db.Exec("UPDATE classes SET name = ? WHERE id = ?", name, id)
	return err
}

func (r *ClassRepo) Delete(id int64) error {
	_, err := r.db.Exec("DELETE FROM classes WHERE id = ?", id)
	return err
}

func (r *ClassRepo) SetDefault(id int64) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	tx.Exec("UPDATE classes SET is_default = 0")
	tx.Exec("UPDATE classes SET is_default = 1 WHERE id = ?", id)
	return tx.Commit()
}

func (r *ClassRepo) GetDefault() (*model.Class, error) {
	c := &model.Class{}
	var isDefault int
	err := r.db.QueryRow("SELECT id, name, is_default, created_at FROM classes WHERE is_default = 1").
		Scan(&c.ID, &c.Name, &isDefault, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	c.IsDefault = true
	return c, nil
}
