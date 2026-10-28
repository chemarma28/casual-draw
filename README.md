# Casual Draw

A browser-based editor for **Causal Loop Diagrams (CLD)**. Describe a diagram in a small text language, compile it, and export the result as a PNG image.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- npm (installed with Node.js)

## Quick start

```sh
git clone https://github.com/chemarma28/casual-draw.git
cd casual-draw
npm install
npm start
```

Then open [http://localhost:8081/](http://localhost:8081/).

## CLD language

Each statement ends with a semicolon (`;`). Variables are defined with an alias and can be referenced by name afterwards:

```text
@A1(1) > @A5(5) > @A2(2) +> A1;
@A3(3) > @A4(4) > @A6(6) +> A3;
A4 -> A2;
```

- `@Name(text)` defines a variable with the display text `text`.
- `@Name[text]` defines a variable that is drawn with a frame.
- `Name` (without `@`) references a variable that was defined earlier.

### Links

| Syntax | Meaning | Appearance |
| --- | --- | --- |
| `A > B` | Causal link | Black |
| `A +> B` | Positive link | Blue, marked `+` |
| `A -> B` | Negative link | Red, marked `-` |
| `A \|\|> B` | Delayed causal link | Black with a delay mark |
| `A \|\|+> B` | Delayed positive link | Blue with a delay mark |
| `A \|\|-> B` | Delayed negative link | Red with a delay mark |

A variable must be defined before it is used. Defining the same name twice is an error.
