# NVIDIA browser desktop integration

The `feature/nvidia-browser-desktops` branch adds Browser desktop to the video
setup wizard and admin-only browser session controls. Hardware capture stays in
Advanced setup. Channel setup creates its worker automatically; deleting or
cancelling the channel removes its worker/session. Saved login profiles are
retained for recovery. Saved/orphaned entries have confirmed deletion controls.

The corresponding backend and portable NVIDIA worker build are in
[badincite/restreamer on the same feature branch](https://github.com/badincite/restreamer/tree/feature/nvidia-browser-desktops).
See that branch's `browser-manager/README.nvidia.md` for building and deployment.

The UI supports `max_workers=0` (no application cap) and positive administrator
safety caps. This does not bypass NVIDIA driver limits or provide unlimited
hardware capacity. Model/driver compatibility must be verified on each host.
The public website default is blank, not a private deployment URL.
