package main

import (
	"fmt"
	"github.com/fsnotify/fsnotify"
	"io/ioutil"
	"time"
)

const throttleLoadTime = 100 * time.Millisecond

func loadAndWatchShader(filename string) (func() error, <-chan string, error) {
	out := make(chan string)
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, nil, err
	}
	var loaded time.Time

	reload := func() {
		if time.Now().Sub(loaded) < throttleLoadTime {
			// throttle to happen max every throttleLoadTime, to avoid reloading twice due to IDE smart saving logic
			return
		}
		loaded = time.Now()
		shaderSourceBytes, err := ioutil.ReadFile(filename)
		if err != nil {
			panic(err)
		}
		out <- string(shaderSourceBytes)
	}
	err = watcher.Add(filename)
	if err != nil {
		return nil, nil, err
	}
	go func() {
		// trigger initial load
		reload()
		for {
			select {
			case event, ok := <-watcher.Events:
				//log.Println("event:", event, ok)
				if !ok {
					return
				}
				if event.Op&fsnotify.Write == fsnotify.Write {
					//log.Println("modified file:", event.Name)
					reload()
				}
			case err, ok := <-watcher.Errors:
				fmt.Println("watcher error:", err, ok)
				if !ok {
					return
				}
			}
		}
	}()

	return watcher.Close, out, nil
}
