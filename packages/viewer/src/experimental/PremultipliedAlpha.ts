import { wrapEffect } from "@react-three/postprocessing";
import { BlendFunction, Effect } from "postprocessing";

/** Encode transparent pixels as premultiplied sRGB, just like direct canvas rendering. */
class PremultipliedAlphaEffect extends Effect {
  constructor() {
    super(
      "PremultipliedAlpha",
      `
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        float alpha = clamp(inputColor.a, 0.0, 1.0);
        outputColor = vec4(inputColor.rgb, alpha);
        if (alpha > 0.0 && alpha < 1.0) {
          // The scene buffer contains premultiplied linear RGB. Apply the sRGB
          // transfer to straight color, then premultiply again in output space.
          vec3 straight = inputColor.rgb / alpha;
          vec3 encoded = sRGBTransferOETF(vec4(straight, alpha)).rgb * alpha;
          // EffectPass applies its own final sRGB transfer after this effect.
          outputColor.rgb = sRGBToLinear(vec4(encoded, alpha)).rgb;
        }
      }
    `,
      { blendFunction: BlendFunction.SRC },
    );
  }
}

export const PremultipliedAlpha = wrapEffect(PremultipliedAlphaEffect);
