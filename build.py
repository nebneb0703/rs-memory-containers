from jinja2 import Environment, FileSystemLoader
import os
import subprocess
import shutil

env = Environment(
    loader=FileSystemLoader("templates")
)

# Hard-coded create directories
os.makedirs("static/comments", exist_ok=True)

# Build templates
for template in env.list_templates():
    file = template.removesuffix('.jinja')

    # Ignore templates prefixed with `_`
    if os.path.basename(file).startswith("_"):
        continue

    with open(f"static/{file}", "w") as f:
        f.write(env.get_template(template) \
            .render())

# Compile scss
subprocess.run(["sass", "src/style.scss:static/style.css"])

# Copy js
shutil.copyfile("src/main.js", "static/main.js")
