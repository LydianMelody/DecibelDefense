#!/bin/bash

# Ensure bundle.js is up-to-date
cat js/config.js js/audioManager.js js/enemy.js js/tower.js js/ui.js js/game.js js/main.js > js/bundle.js

echo \Bundle successfully created\
