export const sameId = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);

export const hasId = (list, id) => list.some((item) => sameId(item, id));

export const isGroupMember = (group, userId) => hasId(group.members, userId);

export const isGroupAdmin = (group, userId) => hasId(group.admins, userId);

export const isOrganizer = (event, userId) => hasId(event.organizers, userId);

export const isParticipant = (event, userId) => isOrganizer(event, userId) || hasId(event.participants, userId);

export const canSeeGroup = (group, userId) => group.type !== 'secret' || isGroupMember(group, userId);

export const canSeeEvent = (event, userId) => event.visibility === 'public' || isParticipant(event, userId);
