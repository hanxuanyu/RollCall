package model

type Class struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	IsDefault bool   `json:"is_default"`
	CreatedAt string `json:"created_at"`
}
