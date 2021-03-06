import extend from 'lodash/extend'
import map from 'lodash/map'

import Err from 'substance/util/SubstanceError'
import uuid from 'substance/util/uuid'

import Store from './Store'

/**
 * Stores Stencila group sessions.
 *
 * Used to sync group sessions across collaborators.
 *
 * @class      DocumentStore (name)
 * @param      {<type>}  config  The configuration
 */
class DocumentStore extends Store {
  /**
   * Create a new document record and return it
   */
  createDocument (args, cb) {
    if (!args.documentId) {
      args.documentId = uuid()
    }

    this.client.exists(args.documentId + ':record', function (err, exists) {
      if (err) return cb(err)

      if (exists) {
        return cb(new Err('DocumentStore.CreateError', {
          message: 'Could not create because document already exists.'
        }))
      }

      this.client.set(args.documentId + ':record', JSON.stringify(args), function (err, result) {
        cb(err, args)
      })
    }.bind(this))
  }

  documentExists (documentId, cb) {
    this.client.exists(documentId + ':record', function (err, exists) {
      cb(err, Boolean(exists))
    })
  }

  listDocuments (cb) {
    this.client.keys('*:record', function (err, result) {
      // Strip ':record' off keys to give just documentIds
      var documentIds = map(result, function (key) {
        return key.slice(0, -7)
      })
      cb(err, documentIds)
    })
  }

  getDocument (documentId, cb) {
    this.client.get(documentId + ':record', function (err, result) {
      if (err) return cb(err)
      if (result === null) {
        return cb(new Err('DocumentStore.ReadError', {
          message: 'Document could not be found.'
        }))
      }
      cb(null, JSON.parse(result))
    })
  }

  updateDocument (documentId, props, cb) {
    this.client.get(documentId + ':record', function (err, result) {
      if (err) cb(err)
      if (result === null) {
        return cb(new Err('DocumentStore.UpdateError', {
          message: 'Document does not exist.'
        }))
      }
      var updated = JSON.parse(result)
      extend(updated, props)
      this.client.set(documentId + ':record', JSON.stringify(updated), function (err, result) {
        cb(err, updated)
      })
    }.bind(this))
  }

  deleteDocument (documentId, cb) {
    this.client.multi()
      // `GET` the document
      .get(documentId + ':record')
      // `DEL`ete the document
      .del(documentId + ':record')
      // Return the first reply, the one from `GET`
      .exec(function (err, replies) {
        if (err) return cb(err)
        var doc = replies[0]
        if (doc === null) {
          return cb(new Err('DocumentStore.DeleteError', {
            message: 'Document does not exist.'
          }))
        }
        cb(null, JSON.parse(doc))
      })
  }
}

export default DocumentStore
