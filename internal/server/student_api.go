package server

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"RollCall/internal/model"
	"RollCall/internal/service"
)

type StudentAPI struct {
	svc *service.StudentService
}

func (a *StudentAPI) List(w http.ResponseWriter, r *http.Request) {
	classID, err := pathInt64(r, "classID")
	if err != nil {
		jsonErr(w, 400, "invalid classID")
		return
	}
	list, err := a.svc.List(classID)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, list)
}

func (a *StudentAPI) Create(w http.ResponseWriter, r *http.Request) {
	classID, err := pathInt64(r, "classID")
	if err != nil {
		jsonErr(w, 400, "invalid classID")
		return
	}
	var body struct {
		Name      string `json:"name"`
		StudentNo string `json:"student_no"`
		Gender    string `json:"gender"`
	}
	if err := decodeJSON(r, &body); err != nil || body.Name == "" {
		jsonErr(w, 400, "name is required")
		return
	}
	stu, err := a.svc.Create(classID, body.Name, body.StudentNo, body.Gender)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, stu)
}

func (a *StudentAPI) Update(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt64(r, "id")
	if err != nil {
		jsonErr(w, 400, "invalid id")
		return
	}
	var stu model.Student
	if err := decodeJSON(r, &stu); err != nil {
		jsonErr(w, 400, err.Error())
		return
	}
	stu.ID = id
	if err := a.svc.Update(&stu); err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}

func (a *StudentAPI) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt64(r, "id")
	if err != nil {
		jsonErr(w, 400, "invalid id")
		return
	}
	if err := a.svc.Delete(id); err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}

func (a *StudentAPI) Search(w http.ResponseWriter, r *http.Request) {
	classID, err := pathInt64(r, "classID")
	if err != nil {
		jsonErr(w, 400, "invalid classID")
		return
	}
	q := r.URL.Query().Get("q")
	list, err := a.svc.Search(classID, q)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, list)
}

func (a *StudentAPI) Import(w http.ResponseWriter, r *http.Request) {
	classID, err := pathInt64(r, "classID")
	if err != nil {
		jsonErr(w, 400, "invalid classID")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		jsonErr(w, 400, "file is required")
		return
	}
	defer file.Close()

	tmp, err := os.CreateTemp("", "import-*"+filepath.Ext(header.Filename))
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	defer os.Remove(tmp.Name())
	defer tmp.Close()
	io.Copy(tmp, file)
	tmp.Close()

	var students []model.Student
	lower := strings.ToLower(header.Filename)
	if strings.HasSuffix(lower, ".csv") {
		students, err = a.svc.ParseCSV(tmp.Name())
	} else {
		students, err = a.svc.ParseExcel(tmp.Name())
	}
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	for i := range students {
		students[i].ClassID = classID
	}
	count, err := a.svc.BatchCreate(students)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, map[string]int{"count": count})
}

func (a *StudentAPI) Export(w http.ResponseWriter, r *http.Request) {
	classID, err := pathInt64(r, "classID")
	if err != nil {
		jsonErr(w, 400, "invalid classID")
		return
	}
	tmp, err := os.CreateTemp("", "export-*.xlsx")
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	defer os.Remove(tmp.Name())
	tmp.Close()

	if err := a.svc.ExportExcel(classID, tmp.Name()); err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", "attachment; filename=students.xlsx")
	http.ServeFile(w, r, tmp.Name())
}

func (a *StudentAPI) ConfirmImport(w http.ResponseWriter, r *http.Request) {
	classID, err := pathInt64(r, "classID")
	if err != nil {
		jsonErr(w, 400, "invalid classID")
		return
	}
	var students []model.Student
	if err := decodeJSON(r, &students); err != nil {
		jsonErr(w, 400, err.Error())
		return
	}
	for i := range students {
		students[i].ClassID = classID
	}
	count, err := a.svc.BatchCreate(students)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, count)
}
