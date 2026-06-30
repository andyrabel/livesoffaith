#!/usr/bin/env python3
"""Print an alphabetically sorted list of all people in people.json."""
import json

data = json.load(open("data/people.json"))
people = sorted(data, key=lambda p: p["name"].split()[-1])

print(f"{'Name':<35} {'Born–Died'}")
print("-" * 55)
for p in people:
    born = f"c.{p['born']}" if p.get("born_approximate") else str(p.get("born", "?"))
    died = str(p["died"]) if p.get("died") else "present"
    print(f"{p['name']:<35} {born}–{died}")

print(f"\n{len(people)} people total")
