package app

import "RollCall/internal/model"

func (a *App) GetClasses() ([]model.Class, error) {
	return a.classSvc.List()
}

func (a *App) CreateClass(name string) (*model.Class, error) {
	return a.classSvc.Create(name)
}

func (a *App) UpdateClass(id int64, name string) error {
	return a.classSvc.Update(id, name)
}

func (a *App) DeleteClass(id int64) error {
	return a.classSvc.Delete(id)
}

func (a *App) SetDefaultClass(id int64) error {
	return a.classSvc.SetDefault(id)
}

func (a *App) GetDefaultClass() (*model.Class, error) {
	return a.classSvc.GetDefault()
}

func (a *App) GetClassStudentCount(classID int64) (int, error) {
	return a.classSvc.GetStudentCount(classID)
}
