package config

import (
	"path/filepath"

	"github.com/fsnotify/fsnotify"
)

func Watch(configDir string) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return
	}
	go func() {
		defer watcher.Close()
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				if event.Has(fsnotify.Write) || event.Has(fsnotify.Create) {
					reload()
				}
			case _, ok := <-watcher.Errors:
				if !ok {
					return
				}
			}
		}
	}()
	watcher.Add(filepath.Clean(configDir))
}
