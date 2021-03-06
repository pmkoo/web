import Macro from './Macro'
import Editing from 'substance/model/Editing'

class AnnotationMacro extends Macro {

  performAction (match, props, context) {
    var surface = context.surfaceManager.getSurface(props.selection.surfaceId)
    surface.transaction(function (tx, args) {
      var data = this.createNodeData(match)

      // Replace matched text
      var selection = tx.createSelection(props.path, match.index, match.index + match[0].length)
      let editing = new Editing()
      var newText = editing.replaceText(tx, {
        selection: selection,
        text: data.text
      })

      // Create annotation
      data.path = newText.selection.path
      data.startOffset = newText.selection.startOffset - newText.text.length
      data.endOffset = newText.selection.endOffset
      tx.create(data)

      // Insert a space to end the annotation
      // CHECK Is there a better way to do this?
      // When you create a selection at end of `newText` it is still annotated
      tx.update(newText.selection.path, { insert: { offset: newText.selection.startOffset, value: ' ' } })

      // Put selection just after annotation
      args.selection = tx.createSelection(newText.selection.path, newText.selection.endOffset + 1)

      return args
    }.bind(this))
  }

}

export default AnnotationMacro
