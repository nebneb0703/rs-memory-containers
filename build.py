from jinja2 import Environment, FileSystemLoader
import subprocess
import shutil

env = Environment(
    loader=FileSystemLoader("templates")
)

# Build templates
for template in env.list_templates():
    with open(f"static/{template.removesuffix('.jinja')}", "w") as f:
        f.write(env.get_template(template) \
            .render())

# Compile scss
subprocess.run(["sass", "src/style.scss:static/style.css"])

# Copy js
shutil.copyfile("src/main.js", "static/main.js")
