# Contributing

Thanks for helping make drivetrain SVGs better.

## Local workflow

```bash
npm install
npm test
```

Use `npm run examples` when a change affects generated SVG output, then review the files in `examples/svg/`.

## Runtime rule

Keep `src/` environment-neutral. Runtime code should return SVG strings and should not depend on Node.js, the DOM, a framework, the filesystem, or network access.

## Good changes

- More accurate drivetrain geometry.
- Small, documented API additions.
- New style presets that make real bicycle parts easier to inspect.
- Tests that lock down geometry or import compatibility.
- Real drivetrain data: cassette names, tooth counts, chainring sizes, colors/finishes, model years, and source links are especially welcome so the preset/demo dataset can grow beyond the starter examples.
