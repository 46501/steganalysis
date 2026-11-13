"""
Validates backend/Dockerfile syntax, dynamic port expansion, and CPU-only PyTorch setup.
"""

from pathlib import Path
import json

def validate_dockerfile():
    df_path = Path(__file__).resolve().parent.parent / "Dockerfile"
    lines = df_path.read_text(encoding="utf-8").splitlines()

    valid_instructions = {
        "FROM", "ENV", "WORKDIR", "RUN", "COPY", "EXPOSE",
        "CMD", "ENTRYPOINT", "VOLUME", "USER", "ARG", "LABEL", "HEALTHCHECK", "SHELL"
    }

    errors = []
    cmd_found = False
    torch_cpu_found = False
    uvicorn_port_correct = False

    full_text = df_path.read_text(encoding="utf-8")

    # 1. Check CPU-only PyTorch
    if "https://download.pytorch.org/whl/cpu" in full_text and "pip install --no-cache-dir torch torchvision" in full_text:
        torch_cpu_found = True

    # 2. Check dynamic port
    if 'CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]' in full_text:
        cmd_found = True
        uvicorn_port_correct = True

    # 3. Instruction validation
    current_inst = None
    for i, line in enumerate(lines, 1):
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if not line.startswith(" ") and not line.startswith("\t"):
            inst = s.split(None, 1)[0]
            if inst not in valid_instructions:
                errors.append(f"Line {i}: Unknown instruction '{inst}'")

    print("=" * 60)
    print("StegoShield AI — Dockerfile Validation Results")
    print("=" * 60)
    print(f"[*] Dockerfile Path               : {df_path}")
    print(f"[*] Instruction Syntax Errors     : {len(errors)}")
    print(f"[*] CPU-only PyTorch Configured   : {torch_cpu_found}")
    print(f"[*] Dynamic $PORT Support         : {uvicorn_port_correct}")
    print(f"[*] Default Fallback Port         : 8000")
    print(f"[*] Host Binding                  : 0.0.0.0")

    # 4. Simulate bash/sh parameter expansion: ${PORT:-8000}
    # When PORT is set to 10000 (Render production):
    port_render = 10000
    expanded_render = f"uvicorn app.main:app --host 0.0.0.0 --port {port_render}"
    # When PORT is unset (local Docker):
    port_local = None
    expanded_local = f"uvicorn app.main:app --host 0.0.0.0 --port {port_local or 8000}"
    
    print("\n--- Simulated Shell Parameter Expansion ---")
    print(f"[*] When PORT=10000 (Render)  -> {expanded_render}")
    print(f"[*] When PORT=unset (Local)   -> {expanded_local}")

    assert not errors, f"Syntax errors: {errors}"
    assert torch_cpu_found, "CPU-only PyTorch index not found"
    assert uvicorn_port_correct, "Dynamic $PORT CMD not found"
    print("\n[OK] ALL DOCKERFILE VALIDATION CHECKS PASSED!")

if __name__ == "__main__":
    validate_dockerfile()

