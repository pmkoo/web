import BlockNodeMacro from '../../ui/BlockNodeMacro'

/**
 * A macro for creating and modifying headings
 *
 * Uses Markdown style headers: hashes followed by one of more spaces
 * at the beginning of a line indicate a heading with `level` equal
 * to the number of hashes e.g.
 *
 *   # Heading 1
 *   ## Heading 2
 *
 * When detected on a paragraph will change to a heading.
 * When detected on a heading will change the level of the heading
 * to match the number of hashes.
 *
 * @class      HeadingMacro (name)
 */
class HeadingMacro extends BlockNodeMacro {

  get appliesTo () {
    return ['paragraph', 'heading']
  }

  get regex () {
    return /^(#+)\s+(.*?)$/
  }

  createNodeData (match) {
    return {
      type: 'heading',
      level: match[1].length,
      content: match[2]
    }
  }
}

export default HeadingMacro
