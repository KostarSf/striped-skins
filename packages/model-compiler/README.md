# Internal Mson compiler

Build-time only, with no dependencies on React, Three.js, Minecraft or Java.
`compileModel(id, resolver)` accepts a resource resolver and returns named nodes
and indexed-surface-ready quads. File access, source hash verification and output
generation live in `generate.mjs`, outside the pure compiler.

Supported subset, based on the pinned Mson 1.9.3 source:

- File parents replace named top-level components; they do not deep-merge them.
- Locals, nested arithmetic expressions and slot-bound overrides.
- Compound nodes, slots for ears/snout/tail/segments, planar sets and box/plane cubes.
- Texture coordinates, pivots, ZYX rotations, dilation and used mirror operations.
- Planar shared-edge fixtures for the included surface definitions.

Unknown fields, component types, Java implementations, missing resources and
cycles fail generation. This is not a generic Mson implementation. Component
links, arbitrary imports/Java classes, cone/quads primitives and dynamic model
data are not supported. Extend with fixtures before adding new upstream models.

Generated geometry describes source coordinates only. Java visibility, standing
pose, size transforms and future animation controllers remain in the model/viewer
layers, rather than being executed by this compiler.
