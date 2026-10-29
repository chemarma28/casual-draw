# Casual Draw

Browser-based editor for **Causal Loop Diagrams (CLD)**. Describe a diagram in a small text language, compile it, and export the result as a PNG image.

## Requirements

- Node.js 18+
- npm

## Quick start

```sh
npm install
npm run dev
```

Open [http://127.0.0.1:1234/](http://127.0.0.1:1234/).

For a production build:

```sh
npm run build
```

## CLD language

Each statement ends with a semicolon (`;`). Variables are defined with an alias and can be referenced by name afterwards:

```text
@Population[Population] +> @Births(Births) ||+> Population;
Population +> @Deaths(Deaths) -> Population;
Population -> @Food(Food supply);
Food +> @BirthRate(Birth rate) +> Births;
Food -> @DeathRate(Death rate) +> Deaths;
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
