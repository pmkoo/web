import Err from 'substance/util/SubstanceError'

import Store from './Store'

/*
  Implements Substance SnapshotStore API using Redis hashes
*/
class SnapshotStore extends Store {
  /*
    Get Snapshot by documentId and version. If no version is provided
    the highest version available is returned

    @return {Object} snapshot record
  */
  getSnapshot (args, cb) {
    if (!args || !args.documentId) {
      return cb(new Err('InvalidArgumentsError', {
        message: 'args require a documentId'
      }))
    }

    var documentId = args.documentId
    var version = args.version

    // Check any snapshot exists for this doc
    this.client.exists(documentId + ':snapshots', function (err, exists) {
      if (err) return cb(err)

      // Return undefined if none
      if (!exists) return cb(null, undefined)

      // Get the available versions
      this.client.hkeys(documentId + ':snapshots', function (err, availableVersions) {
        if (err) return cb(err)

        // Return undefined if no versions available
        if (availableVersions.length === 0) return cb(null, undefined)

        if (!version) {
          // If no version specified return the latest version available
          var latestVersion = Math.max.apply(null, availableVersions)
          this.client.hget(documentId + ':snapshots', latestVersion, function (err, result) {
            if (err) return cb(err)

            cb(null, JSON.parse(result))
          })
        } else {
          // Attemt to get the version secified
          this.client.hget(documentId + ':snapshots', version, function (err, result) {
            if (result === null) {
              // We don't have a snaphot for that requested version so
              // attempt to find closest
              if (!args.findClosest) {
                return cb(err)
              } else {
                var smallerVersions = availableVersions.filter(function (v) {
                  return parseInt(v, 10) < version
                })
                var closestVersion = Math.max.apply(null, smallerVersions)
                this.client.hget(documentId + ':snapshots', closestVersion, function (err, result) {
                  if (err) return cb(err)

                  return cb(null, JSON.parse(result))
                })
              }
            } else {
              cb(null, JSON.parse(result))
            }
          }.bind(this))
        }
      }.bind(this))
    }.bind(this))
  }

  /*
    Stores a snapshot for a given documentId and version.

    Please note that an existing snapshot will be overwritten.
  */
  saveSnapshot (args, cb) {
    var snapshot = {
      documentId: args.documentId,
      version: args.version,
      data: args.data
    }
    this.client.hset(snapshot.documentId + ':snapshots', snapshot.version, JSON.stringify(snapshot), function (err, result) {
      cb(err, snapshot)
    })
  }

  /*
    Removes a snapshot and returns it
  */
  deleteSnaphot (documentId, version, cb) {
    this.client.multi()
      .hget(documentId + ':snapshots', version)
      .hdel(documentId + ':snapshots', version)
      .exec(function (err, replies) {
        if (err) cb(err)

        var snapshot = replies[0]
        if (snapshot === null) {
          return cb(new Err('DeleteError', {
            message: 'Snapshot could not be found'
          }))
        }

        cb(null, snapshot)
      })
  }

  /*
    Deletes all snapshots for a document and returns
    the number of snapshots deleted
  */
  deleteSnapshotsForDocument (documentId, cb) {
    this.client.multi()
      .hlen(documentId + ':snapshots')
      .del(documentId + ':snapshots')
      .exec(function (err, replies) {
        if (err) return cb(err)

        var versions = replies[0]
        cb(null, versions)
      })
  }

  /*
    Returns true if a snapshot exists for a certain version
  */
  snapshotExists (documentId, version, cb) {
    this.client.hexists(documentId + ':snapshots', version, function (err, result) {
      cb(err, Boolean(result))
    })
  }
}

export default SnapshotStore
