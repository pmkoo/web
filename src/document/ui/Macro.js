class Macro {

  get appliesTo () {
    return []
  }

  get regex () {
    throw new Error('This method is abstract.')
  }

  execute (props, context) {
    if (this.appliesTo.length > 0 && this.appliesTo.indexOf(props.node.type) === -1) {
      return false
    }

    var match = this.regex.exec(props.text)
    if (match) {
      this.performAction(match, props, context)
      return true
    }

    return false
  }

  /**
   * Perform the macro action when matched
   *
   * @param      {<type>}  match   The match
   */
  performAction (match, props, context) {
    throw new Error('This method is abstract.')
  }

  /**
   * Create an object with the data for the new node
   *
   * Should be overidden by derived classes.
   * Analagous to the method with the same name
   * in `packages/inline-node/InsertInlineNodeCommand`.
   *
   * @param      {<type>}  match   The match
   */
  createNodeData (match) {
    throw new Error('This method is abstract.')
  }
}

export default Macro
