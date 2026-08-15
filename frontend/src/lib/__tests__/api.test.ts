import { describe, expect, it } from 'vitest'
import { normalizeVoteResult } from '../api'

describe('normalizeVoteResult', () => {
  it('accepts the contract shape { postId, voted, voteCount }', () => {
    expect(
      normalizeVoteResult({ postId: 'p1', voted: true, voteCount: 12 }, { voteCount: 0, voted: false }),
    ).toEqual({ voteCount: 12, voted: true })
  })

  it('accepts a legacy { voteCount, userVoted } payload', () => {
    expect(
      normalizeVoteResult({ voteCount: 5, userVoted: false }, { voteCount: 0, voted: true }),
    ).toEqual({ voteCount: 5, voted: false })
  })

  it('accepts a full post object with viewerVoted', () => {
    const post = {
      id: 'p1',
      boardId: 'b1',
      title: 'T',
      description: null,
      voteCount: 3,
      viewerVoted: true,
    }
    expect(normalizeVoteResult(post, { voteCount: 0, voted: false })).toEqual({
      voteCount: 3,
      voted: true,
    })
  })

  it('accepts an envelope { post } payload', () => {
    const raw = { post: { voteCount: 9, voted: false } }
    expect(normalizeVoteResult(raw, { voteCount: 0, voted: true })).toEqual({
      voteCount: 9,
      voted: false,
    })
  })

  it('falls back when the shape is unrecognized', () => {
    expect(normalizeVoteResult({ nope: true }, { voteCount: 4, voted: true })).toEqual({
      voteCount: 4,
      voted: true,
    })
    expect(normalizeVoteResult(null, { voteCount: 4, voted: true })).toEqual({
      voteCount: 4,
      voted: true,
    })
  })
})
