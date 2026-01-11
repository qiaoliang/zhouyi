Quick Install TaskMaster
Quick install Task Master globally if not already installed.

Execute this streamlined installation:

```bash
# Check and install in one command
ztm --version 2>/dev/null || npm install -g ztm-ai

# Verify installation
ztm --version

# Quick setup check
ztm models --status || echo "Note: You'll need to set up an AI provider API key"
```

If you see "command not found" after installation, you may need to:
1. Restart your terminal
2. Or add npm global bin to PATH: `export PATH=$(npm bin -g):$PATH`

Once installed, you can use all the ZTM commands!

Quick test: Run `/ztm:help` to see all available commands.