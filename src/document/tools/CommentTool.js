import Tool from 'substance/packages/tools/Tool'

/**
 * Tool for toggling the comment mode of a
 * Stencila Document `VisualEditor`
 *
 * @class      CommentTool (name)
 */
class CommentTool extends Tool {

  onClick () {
    this.send('comment-toggle')
  }

}

export default CommentTool

