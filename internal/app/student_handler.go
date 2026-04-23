package app

import (
	"strings"

	"RollCall/internal/model"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) GetStudents(classID int64) ([]model.Student, error) {
	return a.studentSvc.List(classID)
}

func (a *App) CreateStudent(classID int64, name, studentNo, gender string) (*model.Student, error) {
	return a.studentSvc.Create(classID, name, studentNo, gender)
}

func (a *App) UpdateStudent(stu model.Student) error {
	return a.studentSvc.Update(&stu)
}

func (a *App) DeleteStudent(id int64) error {
	return a.studentSvc.Delete(id)
}

func (a *App) SearchStudents(classID int64, query string) ([]model.Student, error) {
	return a.studentSvc.Search(classID, query)
}

func (a *App) PreviewImport() ([]model.Student, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "导入学生数据",
		Filters: []runtime.FileFilter{
			{DisplayName: "CSV/Excel", Pattern: "*.csv;*.xlsx;*.xls"},
		},
	})
	if err != nil || path == "" {
		return nil, err
	}
	lower := strings.ToLower(path)
	if strings.HasSuffix(lower, ".csv") {
		return a.studentSvc.ParseCSV(path)
	}
	return a.studentSvc.ParseExcel(path)
}

func (a *App) ConfirmImport(classID int64, students []model.Student) (int, error) {
	for i := range students {
		students[i].ClassID = classID
	}
	return a.studentSvc.BatchCreate(students)
}

func (a *App) ExportStudents(classID int64) error {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "导出学生数据",
		DefaultFilename: "students.xlsx",
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel", Pattern: "*.xlsx"},
			{DisplayName: "CSV", Pattern: "*.csv"},
		},
	})
	if err != nil || path == "" {
		return err
	}
	if strings.HasSuffix(strings.ToLower(path), ".csv") {
		return a.studentSvc.ExportCSV(classID, path)
	}
	return a.studentSvc.ExportExcel(classID, path)
}
