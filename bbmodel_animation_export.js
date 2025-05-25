(function() {

	let export_action;
	
	BBPlugin.register('bbmodel_animation_export', {
		title: 'BBModel Animation Exporter',
		icon: 'icon-objects',
		author: 'Jatzylap',
		description: 'Exports an animation as a BBModel file sequence for the Batch Exporter',
		about: 'To export, right click an animation and click Export BBModel Sequence.',
		tags: ['Exporter'],
		version: '0.1.0',
		min_version: '4.0.0',
		variant: 'both',
		onload() {
			
			export_action = new Action('export_bbmodel_sequence', {
				name: 'Export BBModel Sequence',
				description: 'Export animation as a BBModel sequence',
				icon: 'icon-objects',
				category: 'animation',
				condition: () => Modes.animate && Animation.selected,
				click() {
					new Dialog({
						id: 'export_bbmodel_sequence',
						title: 'Export BBModel Sequence',
						form: {
							length: {label: 'Length', type: 'number', value: Animation.selected.length, min: 0, max: 10000},
							fps: {label: 'FPS', type: 'number', value: Animation.selected.snapping, min: 1, max: 1000},
						},
						onConfirm({length, fps}) {
							let archive = new JSZip();
							Timeline.setTime(0);
							for (let frame = 0; frame <= length * fps; frame++) {
								Timeline.setTime(frame / fps);
								Animator.preview();

								let animatable_elements = Outliner.elements.filter(el => el.constructor.animator);

								[...Group.all, ...animatable_elements].forEach(node => {
									let offset_rotation = [0, 0, 0];
									let offset_position = [0, 0, 0];
									let offset_scale = [1, 1, 1];
									let origin = [0, 0, 0];
									origin.V3_set(node.origin);
									Animator.animations.forEach(animation => {
										if (animation.playing) {
											let animator = animation.getBoneAnimator(node);
											let multiplier = animation.blend_weight ? Math.clamp(Animator.MolangParser.parse(animation.blend_weight), 0, Infinity) : 1;
											
											if (node instanceof Group) {
												let rotation = animator.interpolate('rotation');
												let position = animator.interpolate('position');
												let scale = animator.interpolate('scale');
												if (scale instanceof Array) {
													scale[0] = scale[0] > 0 ? scale[0] : 0.001;
													scale[1] = scale[1] > 0 ? scale[1] : 0.001;
													scale[2] = scale[2] > 0 ? scale[2] : 0.001;
													offset_scale.V3_multiply(scale.map(v => v * multiplier));
													origin.V3_set(node.origin);
												}
												if (rotation instanceof Array) offset_rotation.V3_add(rotation.map(v => v * multiplier));
												if (position instanceof Array) offset_position.V3_add(position.map(v => v * multiplier));
											}
										}
									})
									// Rotation
									if (node.rotatable) {
										node.rotation[0] -= offset_rotation[0];
										node.rotation[1] -= offset_rotation[1];
										node.rotation[2] += offset_rotation[2];
									}
									// Position & Scale
									function offset(node) {
										if (node instanceof Group) {
											node.origin.V3_add(offset_position);
											node.children.forEach(offset);
										} else {
											if (node.from) {
												node.from.V3_add(offset_position);
											}
											if (node.to) {
												node.to.V3_add(offset_position);
											}
											if (node.origin && node.origin !== node.from) {
												node.origin.V3_add(offset_position);
											}
											let before_from = node.from;
											let before_to = node.to;
											let before_origin = node.origin;
											origin.forEach(function(ogn, i) {
												if (node.from) {
													node.from[i] = (before_from[i] - node.inflate - ogn) * offset_scale[i];
													node.from[i] = node.from[i] + node.inflate + ogn;
												}
												if (node.to) {
													node.to[i] = (before_to[i] + node.inflate - ogn) * offset_scale[i];
													node.to[i] = node.to[i] - node.inflate + ogn;
													if (Format.integer_size) {
														node.to[i] = node.from[i] + Math.round(node.to[i] - node.from[i])
													}
												}
												if (node.origin) {
													node.origin[i] = (before_origin[i] - ogn) * offset_scale[i];
													node.origin[i] = node.origin[i] + ogn;
												}
											})
										}
									}
									offset(node);
								});

								let bbmodel = Codecs.project.compile()

								archive.file(`${Animation.selected.name}.${frame}.bbmodel`, bbmodel);

								[...Group.all, ...animatable_elements].forEach(node => {
									let offset_rotation = [0, 0, 0];
									let offset_position = [0, 0, 0];
									let offset_scale = [1, 1, 1];
									let origin = [0, 0, 0];
									origin.V3_set(node.origin);
									Animator.animations.forEach(animation => {
										if (animation.playing) {
											let animator = animation.getBoneAnimator(node);
											let multiplier = animation.blend_weight ? Math.clamp(Animator.MolangParser.parse(animation.blend_weight), 0, Infinity) : 1;
											
											if (node instanceof Group) {
												let rotation = animator.interpolate('rotation');
												let position = animator.interpolate('position');
												let scale = animator.interpolate('scale');
												if (scale instanceof Array) {
													scale[0] = scale[0] > 0 ? scale[0] : 0.001;
													scale[1] = scale[1] > 0 ? scale[1] : 0.001;
													scale[2] = scale[2] > 0 ? scale[2] : 0.001;
													offset_scale.V3_multiply(scale.map(v => v * multiplier));
													origin.V3_set(node.origin);
												}
												if (rotation instanceof Array) offset_rotation.V3_add(rotation.map(v => v * multiplier));
												if (position instanceof Array) offset_position.V3_add(position.map(v => v * multiplier));
											}
										}
									})
									// Rotation
									if (node.rotatable) {
										node.rotation[0] += offset_rotation[0];
										node.rotation[1] += offset_rotation[1];
										node.rotation[2] -= offset_rotation[2];
									}
									// Position & Scale
									function offset(node) {
										if (node instanceof Group) {
											node.origin.V3_subtract(offset_position);
											node.children.forEach(offset);
										} else {
											if (node.from) {
												node.from.V3_subtract(offset_position);
											}
											if (node.to) {
												node.to.V3_subtract(offset_position);
											}
											if (node.origin && node.origin !== node.from) {
												node.origin.V3_subtract(offset_position);
											}
											let before_from = node.from;
											let before_to = node.to;
											let before_origin = node.origin;
											origin.forEach(function(ogn, i) {
												if (node.from) {
													node.from[i] = (before_from[i] - node.inflate - ogn) / offset_scale[i];
													node.from[i] = node.from[i] + node.inflate + ogn;
												}
												if (node.to) {
													node.to[i] = (before_to[i] + node.inflate - ogn) / offset_scale[i];
													node.to[i] = node.to[i] - node.inflate + ogn;
													if (Format.integer_size) {
														node.to[i] = node.from[i] + Math.round(node.to[i] - node.from[i])
													}
												}
												if (node.origin) {
													node.origin[i] = (before_origin[i] - ogn) / offset_scale[i];
													node.origin[i] = node.origin[i] + ogn;
												}
											})
										}
									}
									offset(node);
								});
							}

							archive.generateAsync({type: 'blob'}).then(content => {
								Blockbench.export({
									resource_id: 'model',
									type: 'Zip Archive',
									extensions: ['zip'],
									name: Animation.selected.name,
									content: content,
									savetype: 'zip'
								});
							})
						}
					}).show();
				}
			})
	
			Animation.prototype.menu.addAction(export_action, '-1');
		},
		onunload() {
			export_action.delete();
		}
	});
})()