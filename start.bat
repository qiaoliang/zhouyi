@echo off
REM 周易通 - Windows一键启动脚本

setlocal enabledelayedexpansion

echo ========================================
echo   周易通 - ZhouYi Tong
echo   一键启动脚本 (Windows)
echo ========================================
echo.

REM 检查Docker是否运行
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker未运行,请先启动Docker Desktop
    pause
    exit /b 1
)

echo [INFO] Docker环境检查通过
echo.

REM 检查.env文件
if not exist ".env" (
    echo [WARNING] .env文件不存在,创建默认配置...

    (
        echo # 微信小程序配置
        echo WECHAT_APP_ID=your_wechat_app_id
        echo WECHAT_APP_SECRET=your_wechat_app_secret
        echo.
        echo # JWT密钥 ^(请修改为随机字符串^)
        echo JWT_SECRET=change-this-to-random-string
        echo.
        echo # 端口配置
        echo BACKEND_PORT=3000
        echo MONGODB_PORT=27017
        echo REDIS_PORT=6379
        echo.
        echo # 数据库配置
        echo MONGODB_USERNAME=admin
        echo MONGODB_PASSWORD=admin123
        echo.
        echo # Redis配置
        echo REDIS_PASSWORD=redis123
    ) > .env

    echo [SUCCESS] .env文件已创建
    echo [WARNING] 请修改.env文件中的配置后重新运行脚本
    pause
    exit /b 0
)

echo [INFO] 环境变量文件检查通过
echo.

REM 询问是否重新构建
set /p rebuild="是否重新构建镜像? [y/N]: "

if /i "%rebuild%"=="y" (
    echo [INFO] 拉取Docker镜像...
    docker compose -f docker-compose.app.yml pull

    echo [INFO] 构建应用镜像...
    docker compose -f docker-compose.app.yml build
)

echo [INFO] 启动Docker服务...
docker compose -f docker-compose.app.yml up -d

echo.
echo [INFO] 等待服务启动...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo   服务启动成功！
echo ========================================
echo.
echo 服务访问地址:
echo   后端 API:        http://localhost:3000
echo   API文档:         http://localhost:3000/api/docs
echo   MongoDB Express: http://localhost:8081
echo   Redis Commander: http://localhost:8082
echo.
echo 数据库连接信息:
echo   MongoDB:         mongodb://localhost:27017
echo   Redis:           redis://localhost:6379
echo.
echo 默认账号密码:
echo   MongoDB:         admin / admin123
echo   Mongo Express:   admin / admin123
echo.
echo 常用命令:
echo   查看日志: docker-compose -f docker-compose.app.yml logs -f
echo   停止服务: docker-compose -f docker-compose.app.yml down
echo   重启服务: restart.bat
echo.

pause
