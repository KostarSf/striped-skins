# UI assets

The SVG icons are original UI assets exported from the user-provided Figma design:
https://www.figma.com/design/7ZqpYdHWnQuAYr3YMWhbId?node-id=4-2

Their native sizes are preserved: visibility 16×16, tools 20×20.
The brush accent is adapted to the application’s orange theme. The header uses
the original orange striped logo from `/icon.png`; `brand.svg` is retained as a
reference asset from the supplied design.
The model illustration and illustrative texture atlas in Figma are placeholders;
the application renders the actual model and editable skin instead.

`InterVariable.woff2` is self-hosted from the Inter project's official distribution
(https://rsms.me/inter/font-files/InterVariable.woff2). Its SIL Open Font License
is included in `Inter-LICENSE.txt`. No Figma asset URLs or remote font services
are needed at runtime. Additional action icons come from the existing Heroicons
dependency.
