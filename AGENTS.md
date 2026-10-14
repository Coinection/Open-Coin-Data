# Agent instructions for Open-Coin-Data

## Coin files

The reference for how a coin file should look is [coin-template.md](./.ocd/templates/coin-template.md).
Always check it before creating or updating a coin file.

## Conventions

- Mintages table columns are `Circulated | Brilliant Uncirculated | Proof`.
- Show full maxima per column, like previous years do. Do not subtract one
  quality from another (e.g. `Circulated` holds the legal maximum, `Proof`
  holds its own maximum next to it).
- `Brilliant Uncirculated` stays `0` for products whose quality is only
  "Uncirculated" / "No Circulada" — that is not BU.
- Sources: only sources from the issuing country itself count (national
  gazette, central bank, national mint). The ECB and foreign mints are
  not accepted as sources.
- Source labels are exactly `Mintage Circulated`, `Mintage BU`,
  `Mintage Proof`, `Issue Date`, `Designer`, as bullet lines starting
  with `- `.
- Multiple sources for one column go on a single line:
  `- Mintages Proof [1](url1), [2](url2)`
- Label sources by table column only (`BU`, `Proof`). No product-type
  qualifiers such as "in year set": a year-set source for a BU coin is
  just `BU`, and for a Proof coin just `Proof`.
