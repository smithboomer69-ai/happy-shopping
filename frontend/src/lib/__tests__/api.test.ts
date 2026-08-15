import { describe, expect, it } from 'vitest'
import { normalizeVoteResult } from '../api'

describe('normalizeVoteResult', () => {
  it('accepts a bare { voteCount, userVoted } payload', () => {
    expect(normalizeVoteResult({ voteCount: 12, userVoted: true }, { voteCount: 0, userVoted: false })).toEqual({
      voteCount: 12,
      userVoted: true,
    })
  })

  it('accepts a full post object', () => {
    const post = { id: 'p1', boardId: 'b1', title: 'T', description: '', voteCount: 3, userVoted: true }
    expect(normalizeVoteResult(post, { voteCount: 0, userVoted: false })).toEqual({
      voteCount: 3,
      userVoted: true,
    })
  })

  it('accepts an envelope { post } payload', () => {
    const raw = { post: { voteCount: 9, userVoted: false } }
    expect(normalizeVoteResult(raw, { voteCount: 0, userVoted: false })).toEqual({
      voteCount: 9,
      userVoted: false,
    })
  })

  it('falls back when the shape is unrecognized', () => {
    expect(normalizeVoteResult({ nope: true }, { voteCount: 4, userVoted: true })).toEqual({
      voteCount: 4,
      userVoted: true,
    })
    expect(normalizeVoteResult(null, { voteCount: 4, userVoted: true })).toEqual({
      voteCount: 4,
      userVoted: true,
    })
  })
})
