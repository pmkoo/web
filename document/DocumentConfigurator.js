'use strict';

var Configurator = require('substance/util/Configurator');

/**
 * A "configurator" for a document.
 *
 * Uses the Substance package mechanism to reduce repetition.
 * See `substance/util/AbstractConfigurator` for inherited methods
 * used by `DocumentHTMLImporter`, `DocumentEditor` etc
 *
 * @class      DocumentConfigurator (name)
 */
function DocumentConfigurator () {
  DocumentConfigurator.super.apply(this, arguments);

  // Define the schema (used by `getSchema()` to generate a `DocumentSchema` based on this
  // and the nodes added below by imports)
  this.defineSchema({
    name: 'stencila-document',
    defaultTextType: 'paragraph'
  });

  // Import node packages, in "order of appearance"
  this.import(require('./nodes/title/TitlePackage'));
  this.import(require('./nodes/summary/SummaryPackage'));
  this.import(require('./nodes/heading/HeadingPackage'));
  this.import(require('./nodes/paragraph/ParagraphPackage'));

  this.import(require('./nodes/emphasis/EmphasisPackage'));
  this.import(require('./nodes/strong/StrongPackage'));
  this.import(require('./nodes/subscript/SubscriptPackage'));
  this.import(require('./nodes/superscript/SuperscriptPackage'));
  this.import(require('./nodes/code/CodePackage'));
  this.import(require('./nodes/link/LinkPackage'));
  this.import(require('./nodes/math/MathPackage'));
  this.import(require('./nodes/emoji/EmojiPackage'));

  this.import(require('./nodes/image/ImagePackage'));
  this.import(require('./nodes/blockquote/BlockquotePackage'));
  this.import(require('./nodes/codeblock/CodeblockPackage'));

  this.import(require('./nodes/execute/ExecutePackage'));
  this.import(require('./nodes/print/PrintPackage'));

  this.import(require('./nodes/mark/MarkPackage'));
  this.import(require('./nodes/discussion/DiscussionPackage'));
  this.import(require('./nodes/comment/CommentPackage'));

  this.import(require('./nodes/default/DefaultPackage'));

  // Import UI packages
  this.import(require('./tools/ToolsPackage'));
  this.import(require('./editors/visual/VisualEditorPackage'));

  // Icons, not defined in Substance packages but used in our `BlockToolset`
  this.addIcon('heading', { 'fontawesome': 'fa-header' });
  this.addIcon('paragraph', { 'fontawesome': 'fa-paragraph' });
  this.addIcon('list', { 'fontawesome': 'fa-list' });
  this.addIcon('table', { 'fontawesome': 'fa-table' });
  this.addIcon('blockquote', { 'fontawesome': 'fa-quote-right' });
  this.addIcon('codeblock', { 'fontawesome': 'fa-code' });

  // CHECK Is this needed?
  this.import(require('substance/packages/base/BasePackage'));
}

DocumentConfigurator.Prototype = function () {
  /**
   * Gets the file client
   *
   * Method required by `AbstractEditor._initialize`
   *
   * @return     {<type>}  The file client.
   */
  this.getFileClient = function () {
    return null;
  };

  /**
   * Gets the save handler.
   *
   * Method required by `AbstractEditor._initialize`
   *
   * @return     {<type>}  The save handler.
   */
  this.getSaveHandler = function () {
    return null;
  };
};

Configurator.extend(DocumentConfigurator);

module.exports = DocumentConfigurator;