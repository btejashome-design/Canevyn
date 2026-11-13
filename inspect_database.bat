@echo off
title CaneVyn Database Inspector
echo ========================================================
echo Refreshing database export and launching visual inspector...
echo ========================================================
python backend\export_db.py
echo.
echo Opening database_viewer.html in your default web browser...
start "" "%~dp0database_viewer.html"
echo.
echo Done! You can view all tables, rows, and records in your browser.
pause
