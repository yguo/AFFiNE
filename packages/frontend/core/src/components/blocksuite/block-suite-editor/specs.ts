import type { BlockSpec } from '@blocksuite/block-std';
import type { PageService, ParagraphService } from '@blocksuite/blocks';
import {
  AttachmentService,
  CanvasTextFonts,
  DocEditorBlockSpecs,
  DocPageService,
  EdgelessEditorBlockSpecs,
  EdgelessPageService,
} from '@blocksuite/blocks';
import bytes from 'bytes';
import { html, unsafeStatic } from 'lit/static-html.js';
import ReactDOMServer from 'react-dom/server';

class CustomAttachmentService extends AttachmentService {
  override mounted(): void {
    // blocksuite default max file size is 10MB, we override it to 2GB
    // but the real place to limit blob size is CloudQuotaModal / LocalQuotaModal
    this.maxFileSize = bytes.parse('2GB');
  }
}

function customLoadFonts(service: PageService): void {
  const officialDomains = new Set(['app.affine.pro', 'affine.fail']);
  if (!officialDomains.has(window.location.host)) {
    const fonts = CanvasTextFonts.map(font => ({
      ...font,
      // self-hosted fonts are served from /assets
      url: '/assets/' + new URL(font.url).pathname.split('/').pop(),
    }));
    service.fontLoader.load(fonts);
  } else {
    service.fontLoader.load(CanvasTextFonts);
  }
}

class CustomDocPageService extends DocPageService {
  override loadFonts(): void {
    customLoadFonts(this);
  }
}
class CustomEdgelessPageService extends EdgelessPageService {
  override loadFonts(): void {
    customLoadFonts(this);
  }
}

type AffineReference = HTMLElementTagNameMap['affine-reference'];
type PageReferenceRenderer = (reference: AffineReference) => React.ReactElement;

export interface InlineRenderers {
  pageReference?: PageReferenceRenderer;
}

function patchSpecsWithReferenceRenderer(
  specs: BlockSpec<string>[],
  pageReferenceRenderer: PageReferenceRenderer
) {
  const renderer = (reference: AffineReference) => {
    const node = pageReferenceRenderer(reference);
    const inner = ReactDOMServer.renderToString(node);
    return html`${unsafeStatic(inner)}`;
  };
  return specs.map(spec => {
    if (
      ['affine:paragraph', 'affine:list', 'affine:database'].includes(
        spec.schema.model.flavour
      )
    ) {
      // todo: remove these type assertions
      spec.service = class extends (spec.service as typeof ParagraphService) {
        override mounted() {
          super.mounted();
          this.referenceNodeConfig.setCustomContent(renderer);
        }
      };
    }

    return spec;
  });
}

/**
 * Patch the block specs with custom renderers.
 */
export function patchSpecs(
  specs: BlockSpec<string>[],
  inlineRenderers?: InlineRenderers
) {
  let newSpecs = specs;
  if (inlineRenderers?.pageReference) {
    newSpecs = patchSpecsWithReferenceRenderer(
      newSpecs,
      inlineRenderers.pageReference
    );
  }
  return newSpecs;
}

export const docModeSpecs = DocEditorBlockSpecs.map(spec => {
  if (spec.schema.model.flavour === 'affine:attachment') {
    return {
      ...spec,
      service: CustomAttachmentService,
    };
  }
  if (spec.schema.model.flavour === 'affine:page') {
    return {
      ...spec,
      service: CustomDocPageService,
    };
  }
  return spec;
});
export const edgelessModeSpecs = EdgelessEditorBlockSpecs.map(spec => {
  if (spec.schema.model.flavour === 'affine:attachment') {
    return {
      ...spec,
      service: CustomAttachmentService,
    };
  }
  if (spec.schema.model.flavour === 'affine:page') {
    return {
      ...spec,
      service: CustomEdgelessPageService,
    };
  }
  return spec;
});
